mkdir log
dt=$( date + "%Y %m %d-%H:%M%S" )
LOG="log.txt"
BACKUPLOG=log/$dt.txt
if [ -f $LOG ]; then
	cp $LOG $BACKUPLOG
fi

yarn ts-node src/quickstart.ts 2>&1 | tee $LOG 
