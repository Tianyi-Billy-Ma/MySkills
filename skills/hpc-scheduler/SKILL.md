---
name: hpc-scheduler
description: Expert guidance for HPC cluster job schedulers (SLURM, PBS/Torque, SGE). Use when users mention submitting jobs, checking queues, requesting GPUs/CPUs, creating batch scripts, running array jobs, or working with HPC clusters, supercomputers, or compute nodes. Searches project folder for existing job scripts to suggest GPU groups, partitions, and email addresses.
---

# HPC Scheduler Skill

Expert guidance for HPC cluster job schedulers: SLURM, PBS/Torque, and SGE.

## Core Workflow

**Before generating any batch script:**

1. **Search project folder** for existing job scripts:
   - Find `*.sh` files containing `#SBATCH`, `#PBS`, or `#$` directives
   - Check `AGENTS.md` and `CLAUDE.md` files for cluster configuration
2. **Extract cluster-specific settings**:
   - GPU groups/partitions (e.g., `gpu@@yye7`, `--partition=gpu-long`)
   - Email addresses from existing scripts
   - Common resource patterns
3. **Present options to user**:
   - If multiple GPU groups found → ask user which to use (provide all options + "Type your own")
   - If single email found → use it automatically
   - If multiple emails found → ask user which to use
   - Always provide suggestions based on project patterns

## SLURM

### sbatch - Submit Batch Jobs

**Basic syntax:**
```bash
sbatch [options] script.sh
```

**Common options:**
- `--job-name=NAME` - Job name
- `--output=FILE` - Stdout file (use `%j` for job ID, `%x` for job name)
- `--error=FILE` - Stderr file
- `--time=HH:MM:SS` - Walltime limit
- `--nodes=N` - Number of nodes
- `--ntasks=N` - Total tasks
- `--ntasks-per-node=N` - Tasks per node
- `--cpus-per-task=N` - CPUs per task
- `--mem=SIZE` - Memory per node (e.g., 16G, 32GB)
- `--mem-per-cpu=SIZE` - Memory per CPU
- `--gres=gpu:N` - Request N GPUs
- `--gres=gpu:TYPE:N` - Request N GPUs of specific type
- `--partition=NAME` - Partition/queue name
- `--array=START-END` - Array job range
- `--array=START-END%MAX` - Array with max concurrent
- `--mail-type=TYPE` - Email notification (BEGIN, END, FAIL, ALL)
- `--mail-user=EMAIL` - Email address

**Script template:**
```bash
#!/bin/bash
#SBATCH --job-name=my_job
#SBATCH --output=logs/%x_%j.log
#SBATCH --error=logs/%x_%j.err
#SBATCH --time=24:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=64G
#SBATCH --gres=gpu:4
#SBATCH --partition=gpu
#SBATCH --mail-type=END,FAIL
#SBATCH --mail-user=user@domain.com

set -euo pipefail
mkdir -p logs

# Environment setup
module purge
module load cuda/12.1
conda activate myenv

# Verify GPUs
nvidia-smi

# Run job
python train.py
```

**When generating:**
- Search project for `#SBATCH --partition=` to find available partitions
- Search for `#SBATCH --gres=gpu:` patterns to find GPU types
- Extract email from `#SBATCH --mail-user=` if present

### srun - Run Commands/Interactive Sessions

**Launch interactive session:**
```bash
srun --pty bash
srun --gres=gpu:1 --mem=16G --time=02:00:00 --pty bash
```

**Run command on compute node:**
```bash
srun python script.py
srun --gres=gpu:2 python train.py
```

### squeue - Check Job Status

**View your jobs:**
```bash
squeue -u $USER
squeue -u $USER -o "%.10i %.20j %.8T %.10M %.6D %.4C %.10m %R"
```

**Watch queue:**
```bash
watch -n 5 'squeue -u $USER'
```

### scancel - Cancel Jobs

```bash
scancel <job_id>              # Cancel specific job
scancel -u $USER              # Cancel all your jobs
scancel <job_id>_<index>      # Cancel array task
```

### scontrol - Job Control

```bash
scontrol show job <job_id>    # Detailed job info
scontrol hold <job_id>        # Hold job
scontrol release <job_id>     # Release held job
```

### sacct - Job Accounting

```bash
sacct -j <job_id>             # Job history
seff <job_id>                 # Job efficiency report
```

### sinfo - Cluster Info

```bash
sinfo                         # Partition/node status
sinfo -p gpu                  # GPU partition info
```


### SLURM Environment Variables

| Variable | Description |
|---|---|
| `$SLURM_JOB_ID` | Job ID |
| `$SLURM_JOB_NAME` | Job name |
| `$SLURM_ARRAY_TASK_ID` | Array task index |
| `$SLURM_ARRAY_JOB_ID` | Array master job ID |
| `$SLURM_SUBMIT_DIR` | Submission directory |
| `$SLURM_JOB_NODELIST` | Allocated node list |
| `$SLURM_CPUS_PER_TASK` | CPUs per task |
| `$SLURM_NTASKS` | Total tasks |
| `$CUDA_VISIBLE_DEVICES` | Allocated GPU indices |

### SLURM Array Jobs

```bash
#!/bin/bash
#SBATCH --job-name=sweep
#SBATCH --array=0-49%10        # 50 tasks, max 10 concurrent
#SBATCH --output=logs/sweep_%A_%a.log
#SBATCH --time=04:00:00
#SBATCH --gres=gpu:1

# %A = array master job ID, %a = task index
TASK_ID=$SLURM_ARRAY_TASK_ID

# Pattern 1: Index into a config file
CONFIG=$(sed -n "$((TASK_ID+1))p" configs.txt)
python train.py --config $CONFIG

# Pattern 2: Process different files
FILES=(data/*.csv)
python process.py --input ${FILES[$TASK_ID]}
```

### SLURM Multi-Node Jobs

```bash
#!/bin/bash
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=8
#SBATCH --gres=gpu:4

srun torchrun --nnodes=4 --nproc_per_node=4 train.py
```

### SLURM Troubleshooting

- **Job won't start**: `squeue -j <id> -o "%R"` shows the reason
- **Job efficiency**: `seff <job_id>` after completion
- **GPU not visible**: Verify `--gres=gpu:N` is set, check `$CUDA_VISIBLE_DEVICES`
- **OOM killed**: Increase `--mem`, or use `--mem-per-cpu` for MPI jobs

## PBS/Torque

### qsub - Submit Batch Jobs

**Basic syntax:**
```bash
qsub [options] script.sh
```

**Common options:**
- `-N NAME` - Job name
- `-o FILE` - Stdout file
- `-e FILE` - Stderr file
- `-l walltime=HH:MM:SS` - Walltime limit
- `-l nodes=N:ppn=M` - N nodes with M processors per node
- `-l nodes=N:ppn=M:gpus=G` - With G GPUs per node
- `-l mem=SIZE` - Total memory (e.g., 16gb)
- `-l pmem=SIZE` - Per-process memory
- `-q QUEUE` - Queue name
- `-t START-END` - Array job range
- `-m TYPE` - Email notification (a=abort, b=begin, e=end)
- `-M EMAIL` - Email address
- `-I` - Interactive mode

**Script template:**
```bash
#!/bin/bash
#PBS -N my_job
#PBS -o logs/job.log
#PBS -e logs/job.err
#PBS -l walltime=24:00:00
#PBS -l nodes=1:ppn=8:gpus=4
#PBS -l mem=64gb
#PBS -q gpu
#PBS -m abe
#PBS -M user@domain.com

cd $PBS_O_WORKDIR
set -euo pipefail
mkdir -p logs

module purge
module load cuda/12.1
conda activate myenv

nvidia-smi

python train.py
```

**Critical:** PBS does NOT automatically cd to the submission directory. Always include `cd $PBS_O_WORKDIR` as the first command after directives. Forgetting this is the #1 cause of "module not found" or "file not found" errors.

**When generating:**
- Search project for `#PBS -q` to find available queues
- Search for `gpus=` patterns to find GPU configurations
- Extract email from `#PBS -M` if present

### qsub -I - Interactive Sessions

```bash
qsub -I
qsub -I -l nodes=1:ppn=4:gpus=1 -l walltime=02:00:00 -l mem=16gb
qsub -I -q gpu -l nodes=1:ppn=8:gpus=2 -l walltime=04:00:00
```

### qstat - Check Job Status

```bash
qstat -u $USER                # Your jobs
qstat                         # All jobs
qstat -f <job_id>             # Detailed job info
qstat -f <job_id> | grep -E "job_state|resources_used|exec_host"
```

### qdel - Cancel Jobs

```bash
qdel <job_id>                 # Cancel specific job
qdel $(qselect -u $USER)     # Cancel all your jobs
qdel <job_id>[<index>]        # Cancel array task
```

### qhold / qrls - Hold/Release Jobs

```bash
qhold <job_id>                # Hold job
qrls <job_id>                 # Release held job
```

### tracejob - Job History

```bash
tracejob <job_id>             # Job history and events
```

### pbsnodes - Cluster Info

```bash
pbsnodes                      # All node status
pbsnodes -a                   # Available nodes
```

### PBS Environment Variables

| Variable | Description |
|---|---|
| `$PBS_JOBID` | Job ID |
| `$PBS_JOBNAME` | Job name |
| `$PBS_O_WORKDIR` | Submission directory |
| `$PBS_NODEFILE` | File listing allocated nodes |
| `$PBS_NP` | Number of processors |
| `$PBS_ARRAYID` | Array task index |

### PBS Array Jobs

```bash
#!/bin/bash
#PBS -N sweep
#PBS -t 0-49
#PBS -o logs/sweep.log
#PBS -l walltime=04:00:00
#PBS -l nodes=1:ppn=4:gpus=1

cd $PBS_O_WORKDIR
TASK_ID=$PBS_ARRAYID

CONFIG=$(sed -n "$((TASK_ID+1))p" configs.txt)
python train.py --config $CONFIG
```

### PBS Multi-Node Jobs

```bash
#!/bin/bash
#PBS -l nodes=4:ppn=8:gpus=4
#PBS -l walltime=24:00:00

cd $PBS_O_WORKDIR
mpirun -np 32 ./my_program
```

### PBS Troubleshooting

- **Job fails immediately**: Check for missing `cd $PBS_O_WORKDIR`
- **Module not found**: PBS starts in `$HOME`, not submission dir
- **GPU not visible**: Verify `gpus=N` in resource request
- **OOM killed**: Increase `-l mem=`, check with `tracejob`

## SGE (Sun Grid Engine)

### qsub - Submit Batch Jobs

**Basic syntax:**
```bash
qsub [options] script.sh
```

**Common options:**
- `-N NAME` - Job name
- `-o FILE` - Stdout file
- `-e FILE` - Stderr file
- `-l h_rt=HH:MM:SS` - Hard walltime limit
- `-l s_rt=HH:MM:SS` - Soft walltime limit (sends SIGUSR1 before kill)
- `-pe ENV N` - Parallel environment with N slots (e.g., `-pe smp 8`)
- `-l mem_free=SIZE` - Free memory required
- `-l h_vmem=SIZE` - Hard virtual memory limit per slot
- `-l gpu=N` - Request N GPUs
- `-q QUEUE` - Queue name (e.g., `gpu.q`, `gpu@@yye7`)
- `-t START-END` - Array job range
- `-tc N` - Max concurrent array tasks
- `-cwd` - Run in current working directory
- `-m TYPE` - Email notification (b=begin, e=end, a=abort, s=suspend)
- `-M EMAIL` - Email address

**Script template:**
```bash
#!/bin/bash
#$ -N my_job
#$ -o logs/job.log
#$ -e logs/job.err
#$ -l h_rt=24:00:00
#$ -pe smp 8
#$ -l mem_free=64G
#$ -l gpu=4
#$ -q gpu.q
#$ -cwd
#$ -m beas
#$ -M user@domain.com

set -euo pipefail
mkdir -p logs

module purge
module load cuda/12.1
conda activate myenv

nvidia-smi

python train.py
```

**When generating:**
- Search project for `#$ -q` to find available queues and GPU groups (e.g., `gpu.q`, `gpu@@yye7`)
- Search for `#$ -l gpu=` patterns to find GPU configurations
- Extract email from `#$ -M` if present

### qlogin - Interactive Sessions

```bash
qlogin
qlogin -l h_rt=02:00:00 -pe smp 4 -l mem_free=16G
qlogin -l gpu=1 -l h_rt=04:00:00 -q gpu.q
```

### qstat - Check Job Status

```bash
qstat -u $USER                # Your jobs
qstat                         # All jobs
qstat -j <job_id>             # Detailed job info
qstat -j <job_id> | grep -E "usage|granted_pe|hard resource"
```

### qdel - Cancel Jobs

```bash
qdel <job_id>                 # Cancel specific job
qdel -u $USER                 # Cancel all your jobs
qdel <job_id>.<index>         # Cancel array task
```

### qhold / qrls - Hold/Release Jobs

```bash
qhold <job_id>                # Hold job
qrls <job_id>                 # Release held job
```

### qacct - Job Accounting

```bash
qacct -j <job_id>             # Job history and resource usage
```

### qhost - Cluster Info

```bash
qhost                         # All host status
qhost -q                      # With queue info
```

### SGE Environment Variables

| Variable | Description |
|---|---|
| `$JOB_ID` | Job ID |
| `$JOB_NAME` | Job name |
| `$SGE_TASK_ID` | Array task index |
| `$SGE_O_WORKDIR` | Submission directory |
| `$PE_HOSTFILE` | File listing allocated hosts |
| `$NSLOTS` | Number of allocated slots |
| `$TMPDIR` | Job-specific temp directory |

### SGE Array Jobs

```bash
#!/bin/bash
#$ -N sweep
#$ -t 1-50
#$ -tc 10                      # Max 10 concurrent
#$ -o logs/sweep_$TASK_ID.log
#$ -l h_rt=04:00:00
#$ -l gpu=1
#$ -cwd

TASK_ID=$SGE_TASK_ID

CONFIG=$(sed -n "${TASK_ID}p" configs.txt)
python train.py --config $CONFIG
```

### SGE Multi-Node Jobs

```bash
#!/bin/bash
#$ -pe mpi 32
#$ -l gpu=4

mpirun -np $NSLOTS ./my_program
```

### SGE Troubleshooting

- **Job fails immediately**: Check if `-cwd` is set, or add explicit `cd`
- **GPU not visible**: Verify `-l gpu=N` is set
- **OOM killed**: Increase `-l mem_free=` or `-l h_vmem=`
- **Queue error**: Check available queues with `qconf -sql`

## Environment Setup

### Module Systems

```bash
module avail                   # List all modules
module avail cuda              # Search for cuda
module purge                   # Clean slate
module load cuda/12.1          # Load specific module
module list                    # Show loaded
module save my_env             # Save current set
module restore my_env          # Restore saved set
```

### Conda on HPC

```bash
# Method 1: via module
module load anaconda3
eval "$(conda shell.bash hook)"
conda activate myenv

# Method 2: direct source
source /path/to/miniconda3/etc/profile.d/conda.sh
conda activate myenv
```

### Containers (Singularity/Apptainer)

```bash
# Run with GPU passthrough
singularity exec --nv container.sif python train.py

# Bind mount directories
singularity exec --nv --bind /data:/data,/scratch:/scratch container.sif python train.py
```

### Jupyter on Compute Nodes

```bash
# 1. Get interactive session with GPU
# (SLURM) srun --gres=gpu:1 --mem=16G --time=04:00:00 --pty bash
# (PBS)   qsub -I -l nodes=1:ppn=4:gpus=1 -l walltime=04:00:00
# (SGE)   qlogin -l gpu=1 -l h_rt=04:00:00

# 2. On compute node
conda activate myenv
jupyter lab --no-browser --port=8888

# 3. From login node (separate terminal)
ssh -N -L 8888:COMPUTE_NODE:8888 login_node

# 4. Open browser to localhost:8888
```

## Cross-Scheduler Quick Reference

| Concept | SLURM | PBS/Torque | SGE |
|---|---|---|---|
| Submit | `sbatch` | `qsub` | `qsub` |
| Interactive | `srun --pty bash` | `qsub -I` | `qlogin` |
| Cancel | `scancel` | `qdel` | `qdel` |
| Status | `squeue` | `qstat` | `qstat` |
| Job info | `scontrol show job` | `qstat -f` | `qstat -j` |
| Node info | `sinfo` | `pbsnodes` | `qhost` |
| Accounting | `sacct` / `seff` | `tracejob` | `qacct` |
| Directive | `#SBATCH` | `#PBS` | `#$` |
| Auto-cd | Yes | **No** (`cd $PBS_O_WORKDIR`) | Use `-cwd` |

## Tips

- **Test short first** — 5-minute version before committing to 24-hour runs
- **Log diagnostics** — `nvidia-smi`, `hostname`, `date` at script top
- **Use scratch** — `$TMPDIR` or cluster scratch for heavy I/O, not home
- **Check fairshare** — `sshare -u $USER` (SLURM) for queue priority
- **Error handling** — `set -euo pipefail` catches failures early
